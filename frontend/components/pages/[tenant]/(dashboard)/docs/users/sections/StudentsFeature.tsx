"use client";

import DocSection from "../../_shared/DocSection";
import StepList from "../../_shared/StepList";
import ScreenshotPlaceholder from "../../_shared/ScreenshotPlaceholder";
import Callout from "../../_shared/Callout";

export default function StudentsFeature() {
  return (
    <DocSection
      id="students"
      title="Students"
      description="Enrollment records linked to a Course. Section, semester and roll number make every student uniquely addressable."
    >
      <ScreenshotPlaceholder label="Student list filtered by course & semester" />

      <StepList
        steps={[
          { title: "Make sure courses exist", body: "Org → Departments and the Courses tab. You can't add a student without a course to enroll them in." },
          { title: "Open Students → Add Student", body: "Fill in name, email, course, roll number, section, semester, enrollment date." },
          { title: "Add demographics & guardian info", body: "Date of birth, blood group, address, parent/guardian names and phone. This appears on the student profile and is used by transport, hostel and fee modules." },
          { title: "Save", body: "A login User is created. Students see their own portal at /portal after first login." },
        ]}
      />

      <Callout variant="info" title="What students see">
        Students log in to a focused portal: their own attendance %, marks,
        results, fees due, applied leaves and notices. They never see other
        students' data.
      </Callout>
    </DocSection>
  );
}
