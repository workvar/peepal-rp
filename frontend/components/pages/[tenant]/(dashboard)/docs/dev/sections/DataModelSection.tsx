"use client";

import DocSection from "../../_shared/DocSection";
import DataModelERD from "../../diagrams/DataModelERD";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

export default function DataModelSection() {
  return (
    <DocSection
      id="data-model"
      title="Data model"
      description="Two anchors: Tenant (the institute) and User (the human). Employees and Students are profile rows attached to a User."
    >
      <DataModelERD />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Callout variant="info" title="Why User → Employee/Student?">
          A single login identity can carry multiple profiles over time (a
          student becomes a TA, an alum becomes faculty). Profile data lives in{" "}
          <InlineKey>students</InlineKey> / <InlineKey>employees</InlineKey>{" "}
          tables, while auth & permission data stay on <InlineKey>users</InlineKey>.
        </Callout>
        <Callout variant="warn" title="ID strategy">
          Primary keys are UUIDs (string), generated in GORM <InlineKey>BeforeCreate</InlineKey>{" "}
          hooks. Never assume integer ids in the frontend.
        </Callout>
      </div>
    </DocSection>
  );
}
