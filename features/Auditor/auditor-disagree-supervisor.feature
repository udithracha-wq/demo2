@Regression @NYselections @AuditorDisagreeSupervisor @End_to_End
Feature: Auditor Disagree Supervisor
  When Random Sampling Records has Disagree Verifier Status rows whose Auditor
  Response fields are empty, Request Supervisor Review must show the Auditor
  Response fields must be completed message. When Auditor Response is set to
  Disagree for every Disagree Verifier Status row and Send To Reverify is
  clicked, the Auditor Response agreement update error must appear.
  Transaction numbers are reported in both cases.

  Scenario Outline: Request Supervisor Review blocked when Auditor Response is empty for Disagree
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify Disagree Verifier Status fields are present
    And I clear Auditor Response for all Disagree Verifier Status rows
    And I save Random Sampling Records
    And I return to the Case tab
    And I request Supervisor Review
    Then I should see the Auditor Response fields must be completed message
    And I finish the Supervisor Review prompt
    And I should report all Disagree Verifier Status transaction numbers with empty Auditor Response

    Examples:
      | CaseNumber |
      | 00121029   |

  Scenario Outline: Send to Verify blocked when Auditor Response is Disagree for Disagree Verifier Status
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify Disagree Verifier Status fields are present
    And I set Auditor Response to Disagree for all Disagree Verifier Status rows
    And I save Random Sampling Records
    And I return to the Case tab
    And I send to verify
    Then I should see the Auditor Response agreement update error message
    And I should report all Disagree Verifier Status transaction numbers with Auditor Response Disagree

    Examples:
      | CaseNumber |
      | 00121029   |
