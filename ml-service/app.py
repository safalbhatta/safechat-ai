import gradio as gr
from main import app as fastapi_app

# Hugging Face Gradio SDK requires a Gradio interface.
# We create a simple dummy UI just to satisfy Hugging Face.
def check_status():
    return "✅ SafeChat ML Service is running in the background via FastAPI!"

demo = gr.Interface(
    fn=check_status, 
    inputs=[], 
    outputs="text", 
    title="SafeChat ML Service",
    description="This is the backend AI service. The API is running perfectly."
)

# This mounts your existing FastAPI app (from main.py) onto the root `/`
# and moves the dummy Gradio UI to `/ui`.
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")
