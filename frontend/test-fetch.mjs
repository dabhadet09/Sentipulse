async function test() {
  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "test3", email: "test4@test.com", password: "password123" })
  });
  const data = await res.json();
  console.log(data);
}
test();
