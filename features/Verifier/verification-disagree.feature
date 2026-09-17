@Regression @NYselections @VerificationDisagree @End_to_End
Feature: Verification Disagree
  Search a case, open Random Sampling Records, set every empty
  Verifier Status to Disagree on all report pages, Save, and
  confirm the success message.

  Scenario Outline: Fill empty Verifier Status with Disagree on all pages
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I set empty Verifier Status values to Disagree on all pages
    And I save Random Sampling Records
    Then Random Sampling Records should be saved successfully
    And I should report all Verifier Status transaction numbers marked Disagree

    Examples:
      | CaseNumber |
      | 00121029    |
