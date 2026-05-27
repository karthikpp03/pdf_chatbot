DEPT_KEYWORDS = {
    "Engineering": ["engineering", "software", "developer", "devops", "backend", "frontend",
                    "infrastructure", "architect", "sre", "qa", "testing"],
    "Finance":     ["finance", "financial", "accounting", "accounts", "payroll", "budget",
                    "revenue", "tax", "audit", "treasury", "invoice"],
    "HR":          ["hr", "human resources", "recruitment", "hiring", "onboarding", "employee",
                    "benefits", "performance review", "training", "headcount"],
    "Marketing":   ["marketing", "campaign", "brand", "seo", "social media", "advertising",
                    "content", "growth", "leads", "crm", "product launch"],
}


def detect_chunk_department(chunk_text: str, upload_department: str) -> str:
    text   = chunk_text.lower()
    scores = {dept: 0 for dept in DEPT_KEYWORDS}

    for dept, keywords in DEPT_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                scores[dept] += 1

    best_dept = max(scores, key=scores.get)
    if scores[best_dept] == 0:
        return upload_department or "public"
    return best_dept
