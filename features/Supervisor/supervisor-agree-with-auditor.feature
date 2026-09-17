@Regression @NYselections @SupervisorAgreeWithAuditor @End_to_End
Feature: Supervisor Agree With Auditor
  A case sitting in Supervisor Review carries transactions the auditor marked
  Disagree. The supervisor opens Supervisor Review Data, answers every one of
  those rows by setting Supervisor Status to Agree with Auditor, and saves.
  The save must confirm with the Record Updated notification.

  Scenario Outline: Answer auditor Disagree rows with Agree with Auditor
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "<CaseStatus>"
    When I open Supervisor Review Data
    And I verify Disagree Auditor Response fields are present
    And I set Supervisor Status to "<SupervisorStatus>" for all Disagree Auditor Response rows
    And I save Supervisor Review Data
    Then I should see the Record Updated success message

    Examples:
      | CaseNumber | CaseStatus        | SupervisorStatus   |
      | 00121029   | Supervisor Review | Agree with Auditor |
