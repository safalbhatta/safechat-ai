const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const {
  getModelHealth,
} = require("../services/mlService");

const CLASS_LABELS = [
  "normal",
  "spam",
  "abusive",
  "hateful",
];

const emptyDistribution = () => ({
  normal: 0,
  spam: 0,
  abusive: 0,
  hateful: 0,
});

const normalizeDays = (value) => {
  const days = Number(value);

  if ([7, 30, 90].includes(days)) {
    return days;
  }

  return 30;
};

const roundNumber = (
  value,
  decimals = 2
) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const multiplier = 10 ** decimals;
  return (
    Math.round(numeric * multiplier) /
    multiplier
  );
};

const buildDistribution = (rows = []) => {
  const distribution =
    emptyDistribution();

  rows.forEach((row) => {
    if (
      CLASS_LABELS.includes(row._id)
    ) {
      distribution[row._id] =
        Number(row.count) || 0;
    }
  });

  return distribution;
};

const getProfileAnalytics = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user._id;

    const user = await User.findById(
      currentUserId
    ).select(
      "name username email bio profilePic friends createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const [
      totalMessages,
      distributionRows,
      classifiedSummary,
      lastClassifiedMessage,
    ] = await Promise.all([
      Message.countDocuments({
        senderId: currentUserId,
        isDeleted: false,
      }),
      Message.aggregate([
        {
          $match: {
            senderId: currentUserId,
            messageType: "text",
            isDeleted: false,
            classificationStatus:
              "classified",
            predictedCategory: {
              $in: CLASS_LABELS,
            },
          },
        },
        {
          $group: {
            _id: "$predictedCategory",
            count: {
              $sum: 1,
            },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: {
            senderId: currentUserId,
            messageType: "text",
            isDeleted: false,
            classificationStatus:
              "classified",
            predictedCategory: {
              $in: CLASS_LABELS,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: 1,
            },
            averageConfidence: {
              $avg:
                "$classificationConfidence",
            },
          },
        },
      ]),
      Message.findOne({
        senderId: currentUserId,
        classificationStatus:
          "classified",
      })
        .sort({
          classifiedAt: -1,
          createdAt: -1,
        })
        .select(
          "predictedCategory classificationConfidence classifiedAt modelVersion"
        ),
    ]);

    const distribution =
      buildDistribution(
        distributionRows
      );

    const classifiedTotal =
      classifiedSummary[0]?.total || 0;

    const safeMessageRate =
      classifiedTotal > 0
        ? roundNumber(
            (distribution.normal /
              classifiedTotal) *
              100,
            1
          )
        : 0;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
      summary: {
        totalMessages,
        friendCount:
          user.friends?.length || 0,
        joinedAt: user.createdAt,
        safeMessageRate,
        classifiedMessages:
          classifiedTotal,
        averageConfidence:
          roundNumber(
            classifiedSummary[0]
              ?.averageConfidence * 100,
            1
          ),
      },
      distribution,
      lastClassification:
        lastClassifiedMessage || null,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getDashboardAnalytics = async (
  req,
  res
) => {
  try {
    const currentUserId = req.user._id;
    const days = normalizeDays(
      req.query.days
    );

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(
      since.getDate() - (days - 1)
    );

    const accessibleChatIds =
      await Chat.find({
        members: currentUserId,
      }).distinct("_id");

    const baseQuery = {
      chatId: {
        $in: accessibleChatIds,
      },
      deletedFor: {
        $ne: currentUserId,
      },
      isDeleted: false,
      createdAt: {
        $gte: since,
      },
    };

    const classifiedQuery = {
      ...baseQuery,
      messageType: "text",
      classificationStatus:
        "classified",
      predictedCategory: {
        $in: CLASS_LABELS,
      },
    };

    const [
      distributionRows,
      classifiedSummary,
      sentCount,
      receivedCount,
      filteredReceivedCount,
      timelineRows,
      recentMessages,
      modelHealth,
    ] = await Promise.all([
      Message.aggregate([
        {
          $match: classifiedQuery,
        },
        {
          $group: {
            _id: "$predictedCategory",
            count: {
              $sum: 1,
            },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: classifiedQuery,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: 1,
            },
            averageConfidence: {
              $avg:
                "$classificationConfidence",
            },
            averageLatencyMs: {
              $avg:
                "$classificationLatencyMs",
            },
            lastClassifiedAt: {
              $max: "$classifiedAt",
            },
          },
        },
      ]),
      Message.countDocuments({
        ...baseQuery,
        senderId: currentUserId,
      }),
      Message.countDocuments({
        ...baseQuery,
        senderId: {
          $ne: currentUserId,
        },
      }),
      Message.countDocuments({
        ...classifiedQuery,
        senderId: {
          $ne: currentUserId,
        },
        predictedCategory: {
          $in: [
            "spam",
            "abusive",
            "hateful",
          ],
        },
      }),
      Message.aggregate([
        {
          $match: baseQuery,
        },
        {
          $project: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            predictedCategory: 1,
            classificationStatus: 1,
            messageType: 1,
            isSent: {
              $eq: [
                "$senderId",
                currentUserId,
              ],
            },
          },
        },
        {
          $group: {
            _id: "$day",
            total: {
              $sum: 1,
            },
            sent: {
              $sum: {
                $cond: [
                  "$isSent",
                  1,
                  0,
                ],
              },
            },
            received: {
              $sum: {
                $cond: [
                  "$isSent",
                  0,
                  1,
                ],
              },
            },
            normal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$classificationStatus",
                          "classified",
                        ],
                      },
                      {
                        $eq: [
                          "$predictedCategory",
                          "normal",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            spam: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$predictedCategory",
                      "spam",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            abusive: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$predictedCategory",
                      "abusive",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            hateful: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$predictedCategory",
                      "hateful",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
      Message.find(classifiedQuery)
        .sort({
          classifiedAt: -1,
          createdAt: -1,
        })
        .limit(12)
        .populate(
          "senderId",
          "name username profilePic"
        )
        .select(
          "text predictedCategory classificationConfidence classificationLatencyMs modelVersion classifiedAt createdAt senderId chatId isSafetyHidden"
        ),
      getModelHealth(),
    ]);

    const distribution =
      buildDistribution(
        distributionRows
      );

    const timelineMap = new Map(
      timelineRows.map((row) => [
        row._id,
        row,
      ])
    );

    const timeline = [];

    for (
      let offset = 0;
      offset < days;
      offset += 1
    ) {
      const date = new Date(since);
      date.setDate(
        since.getDate() + offset
      );

      const key = date
        .toISOString()
        .slice(0, 10);

      const row =
        timelineMap.get(key) || {};

      timeline.push({
        date: key,
        total: row.total || 0,
        sent: row.sent || 0,
        received: row.received || 0,
        normal: row.normal || 0,
        spam: row.spam || 0,
        abusive: row.abusive || 0,
        hateful: row.hateful || 0,
      });
    }

    const summary =
      classifiedSummary[0] || {};

    const totalClassified =
      summary.total || 0;

    const filteredMessages =
      distribution.spam +
      distribution.abusive +
      distribution.hateful;

    res.json({
      period: {
        days,
        since,
      },
      summary: {
        totalClassified,
        normalMessages:
          distribution.normal,
        filteredMessages,
        averageConfidence:
          roundNumber(
            summary.averageConfidence *
              100,
            1
          ),
        averageLatencyMs:
          roundNumber(
            summary.averageLatencyMs,
            2
          ),
        sentMessages: sentCount,
        receivedMessages:
          receivedCount,
        filteredReceivedMessages:
          filteredReceivedCount,
        lastClassifiedAt:
          summary.lastClassifiedAt ||
          null,
      },
      distribution,
      timeline,
      recentClassifications:
        recentMessages,
      model: modelHealth,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getModelStatus = async (
  req,
  res
) => {
  try {
    res.json(
      await getModelHealth()
    );
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getProfileAnalytics,
  getDashboardAnalytics,
  getModelStatus,
};
