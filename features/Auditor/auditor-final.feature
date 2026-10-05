@Regression @NYselections @AuditorFinal @End_to_End
Feature: Auditor Final
  An auditor opens a case, generates the Rejected Claims, All Claims, and
  Eligibility reports (collecting any toast/dialog message; download is
  optional), then Approves the case from Approval History with comments.
  The approval dialog must close after submit.

  Scenario Outline: Generate final reports and approve the case
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I generate the Rejected Claims report
    And I generate the All Claims Report
    And I generate the Eligibility Report
    And I should report the collected report messages
    And I choose "Approve" from Approval History with comments "<Comments>"
    Then the approval action should be submitted

    Examples:
      | CaseNumber | Comments |
      | 00120858 | test     |
