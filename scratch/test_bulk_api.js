
async function testApi() {
  const ids = '1208033,1208034'; // Example IDs (I should check real ones)
  const res = await fetch(`http://localhost:3000/api/football/odds/bulk?ids=${ids}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
testApi();
