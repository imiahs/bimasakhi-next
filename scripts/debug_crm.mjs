async function test() {
    const randMobile = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
    const payload = {
        name: "Test User 2026",
        mobile: randMobile,
        pincode: "110001",
        city: "Delhi",
        state: "Delhi",
        locality: "Connaught Place",
        email: "test2026@example.com",
        education: "Graduate",
        occupation: "Job Seeker",
        reason: "",
        phaseTag: "phase1_delhi",
        dndConsent: true,
        recruitment_phase: "phase1_delhi",
        source: "website",
        medium: "direct",
        campaign: "bima_sakhi",
        visitedPages: ["income", "eligibility"],
        session_id: "test-session",
        lead_source_page: "/apply",
        lead_source_type: "funnel"
    };

    console.log("SENDING:", payload);

    try {
        const res = await fetch("https://bimasakhi.com/api/crm/create-lead", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Simulate correct headers
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "X-Forwarded-For": "127.0.0.1"
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log("RESPONSE (", res.status, "):", text);
    } catch(err) {
        console.error("FETCHER ERROR:", err);
    }
}
test();
