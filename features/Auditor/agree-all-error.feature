@Regression @NYselections @AgreeAllError @End_to_End
Feature: Agree All Error
  When Random Sampling Records has any Disagree Verifier Status fields,
  choosing Accept from Approval History must show the
  Verifier update error message, and those transaction numbers are reported.

  Scenario Outline: Accept blocked when Verifier Status is Disagree
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify Disagree Verifier Status fields are present
    And I close Random Sampling Records
    And I choose "<ApprovalAction>" from Approval History with comments "<Comments>"
    Then I should see the Verifier update error message
    And I cancel and close the approval action dialog
    And I should report all Disagree Verifier Status transaction numbers

    Examples:
      | CaseNumber | ApprovalAction | Comments |
      | 00120861   | Accept         | test     |
