async function test() {
  try {
    const email = `test_${Date.now()}@test.com`;
    console.log("Registering user...", email);
    const regRes = await fetch("http://localhost:5002/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testuser_" + Date.now(),
        email: email,
        password: "password123"
      })
    }).then(r => r.json());
    
    const token = regRes.token;
    console.log("Registered successfully. Token:", token.substring(0, 10) + "...");
    
    console.log("Updating profile...");
    const putRes = await fetch("http://localhost:5002/api/users/profile", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        name: "New Name",
        username: "newusername_" + Date.now(),
        bio: "This is a new bio"
      })
    }).then(r => r.json());
    
    console.log("Update response:", putRes);
    
    console.log("Logging in again to check persistence...");
    const loginRes = await fetch("http://localhost:5002/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: "password123"
      })
    }).then(r => r.json());
    
    console.log("Login response:", loginRes);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
