export async function GET() {
    try {
      const resp = await fetch(
        "https://data.edmonton.ca/resource/gdd9-eqv9.json?$limit=1000",
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!resp.ok) return new Response("Fetch error", { status: 500 });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } catch (e) {
      console.error("API error:", e);
      return new Response("Server error", { status: 500 });
    }
  }
  