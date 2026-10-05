@Regression @NYselections @PostGridSelectingAll @End_to_End
Feature: PostGrid Selecting All
  On PostGrid In-District Audit Report, every visible row must be checked,
  then Confirm and Next is clicked. Each batch shows a success message.
  Repeat until the green banner shows All Transactions are Reviewed.

  Scenario Outline: Select all PostGrid rows and Confirm and Next until complete
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open PostGrid In-District Audit Report
    And I select all PostGrid checkboxes and Confirm and Next until all transactions are completed
    Then I should see that all PostGrid transactions are completed

    Examples:
      | CaseNumber |
      | 00120858   |
