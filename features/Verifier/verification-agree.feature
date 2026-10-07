@Regression @NYselections @VerificationAgree @End_to_End
Feature: Verification Agree
  Search a case, open Random Sampling Records, set every empty
  Verifier Status to Agree on all report pages, Save, and
  confirm the success message.

  Scenario Outline: Fill empty Verifier Status with Agree on all pages
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I set empty Verifier Status values to Agree on all pages
    And I save Random Sampling Records
    Then Random Sampling Records should be saved successfully
    And I should report all Verifier Status transaction numbers marked Agree

    Examples:
      | CaseNumber |
      | 00121091   |
