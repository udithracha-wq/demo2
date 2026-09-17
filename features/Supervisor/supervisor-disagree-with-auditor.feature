@Regression @NYselections @SupervisorDisagreeWithAuditor @End_to_End
Feature: Supervisor Disagree With Auditor
  A case sitting in Supervisor Review carries transactions the auditor marked
  Disagree. The supervisor opens Supervisor Review Data, answers every one of
  those rows by setting Supervisor Status to Disagree with Auditor, and saves.
  The save must confirm with the Record Updated notification, after which the
  supervisor rejects the case from the Approval History actions menu by
  entering comments and submitting the Reject dialog.

  Scenario Outline: Answer auditor Disagree rows with Disagree with Auditor and reject the case
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "<CaseStatus>"
    When I open Supervisor Review Data
    And I verify Disagree Auditor Response fields are present
    And I set Supervisor Status to "<SupervisorStatus>" for all Disagree Auditor Response rows
    And I save Supervisor Review Data
    Then I should see the Record Updated success message
    When I close Supervisor Review Data
    And I select "<ApprovalAction>" from the Approval History actions menu
    Then I should see the "<ApprovalAction>" approval dialog
    When I submit the approval action with comments "<Comments>"
    Then the approval action should be submitted

    Examples:
      | CaseNumber | CaseStatus        | SupervisorStatus      | ApprovalAction | Comments |
      | 00121029   | Supervisor Review | Disagree with Auditor | Reject         | test     |
