@Regression @NYselections @EmptyErrorMessage @End_to_End
Feature: Empty Error Message
  When Random Sampling Records has any empty Verifier Status fields,
  choosing Accept or Reject from Approval History must show the
  incomplete review error message.

  Scenario Outline: Approval action blocked when Verifier Status is empty
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify empty Verifier Status fields are present
    And I close Random Sampling Records
    And I choose "<ApprovalAction>" from Approval History with comments "<Comments>"
    Then I should see the incomplete review error message
    And I cancel and close the approval action dialog
    And I should report all empty Verifier Status transaction numbers

    Examples:
      | CaseNumber | ApprovalAction | Comments |
      | 00121011   | Reject         | test     |
      | 00121011   | Accept         | test     |
