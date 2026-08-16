# Onboarding guide source

`../Peepal_ERP_Onboarding_Guide.pdf` is generated from `guide.html` + `guide.css`.

Regenerate after editing the HTML:

```bash
pip install weasyprint
weasyprint guide.html ../Peepal_ERP_Onboarding_Guide.pdf
```

Keep it in sync with `frontend/ONBOARDING.md`, `backend/README.md`, and the live
module registry (`frontend/constants/navigation/`, `frontend/lib/access.ts`).
