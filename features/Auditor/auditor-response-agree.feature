@Regression @NYselections @AuditorResponseAgree @End_to_End
Feature: Auditor Response Agree
  When every Disagree Verifier Status row has Auditor Response set to Agree
  and Send To Reverify is clicked, the rejected Audit Field error must appear
  (rejected audit fields are still empty). Transaction numbers are reported.

  Scenario Outline: Send to Reverify blocked when Auditor Response is Agree but rejected Audit Fields are empty
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify Disagree Verifier Status fields are present
    And I set Auditor Response to Agree for all Disagree Verifier Status rows
    And I save Random Sampling Records
    And I return to the Case tab
    And I send to verify
    Then I should see the rejected Audit Field must be updated error message
    And I should report all Disagree Verifier Status transaction numbers
    And I should report all Disagree Verifier Status transaction numbers with Auditor Response Agree

    Examples:
      | CaseNumber |
      | 00121027   |
