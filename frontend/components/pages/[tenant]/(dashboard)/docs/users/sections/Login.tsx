"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function Login() {
  return (
    <DocSection
      id="login"
      title="Logging in"
      description="Peepal uses email + password only. There is no public signup, accounts are created by an administrator."
    >
      <ScreenshotPlaceholder label="Login screen" ratio="video" />

      <StepList
        steps={[
          { title: "Open your institute URL", body: "It looks like https://peepal.app/<your-org>/login. The slug after the domain identifies your institute." },
          { title: "Enter your work email", body: "This is the email your admin used when creating your account." },
          { title: "Enter your password", body: "First-time users get a temporary password by email — change it immediately from My Profile." },
          { title: "Land on the dashboard", body: "You'll see only the modules your role can access. Teachers see classes, students see their portal, admins see everything." },
        ]}
      />

      <Callout variant="warn" title="Forgot password?">
        Self-serve reset is intentionally disabled. Contact your admin — they
        can reset your password from{" "}
        <em>People → Users → (your row) → Reset password</em>.
      </Callout>
    </DocSection>
  );
}
