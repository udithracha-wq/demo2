@Regression @NYselections @Auditor1 @End_to_End
Feature: NYselections Auditor1 Eligibility Review
  An auditor opens a committee's Cases, works the New Eligibility Review case
  assigned to them, and completes the Committee Eligibility flow. Finishing the
  review must close the flow, leave the Committee Eligibility action on the
  case, and create a Pre-Payment Review case on the same committee for the same
  election year — in Matching Claim Review and assigned to the same auditor.

  Precondition: the committee needs an Eligibility Review case in status New.
  Completing this scenario moves that case to Reviewed, so a re-run needs a
  fresh case (or a committee that still has one).

  Scenario Outline: Eligibility Review creates a Prepayment Review case for the same election year
    Given I am logged into NYselections Lightning
    When I open the Cases list for committee "<Committee>"
    And I open the case with record type "<CaseRecordType>" and status "<Status>"
    # Check 1 — the opened case is the right one and is assigned to the auditor
    Then the case should show record type "<CaseRecordType>" and status "<Status>"
    And the Primary Auditor field should show "<PrimaryAuditor>"

    When I open the Committee Eligibility flow
    And I select "<Party>" for party selection
    # Check 2 — Election Type is display-only on the flow screen
    Then Election Type should not be editable

    When I complete the eligibility questionnaire answering Yes
    Then the Committee Eligibility button should be available on the case
    And the eligibility flow should be closed

    When I open the Cases list for committee "<Committee>"
    Then a new "<FollowOnCaseRecordType>" case should exist for the same election year
    And the case status should be "<FollowOnStatus>"
    And the case should be assigned to "<PrimaryAuditor>"

    # FollowOnCaseRecordType / FollowOnStatus use the org's exact labels:
    # the sandbox calls them "Pre-Payment Review" and "Matching Claim Review".
    Examples:
      | Committee                        | CaseRecordType          | Status | Party      | PrimaryAuditor | FollowOnCaseRecordType | FollowOnStatus        |
      | Scott Comegys for New York State | Eligibility Review Case | New    | Republican | Udith Racha    | Pre-Payment Review     | Matching Claim Review |
