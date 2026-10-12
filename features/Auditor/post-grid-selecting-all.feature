@Regression @NYselections @PostGridSelectingAll @End_to_End
Feature: PostGrid Selecting All
  On PostGrid In-District Audit Report, check every visible row and click
  Confirm and Next until the green banner shows All Transactions are Reviewed.
  If that banner is already showing when the report opens, that is expected.
  Print the banner message and do not treat it as a failure.

  Scenario Outline: Select all PostGrid rows and Confirm and Next until reviewed
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open PostGrid In-District Audit Report
    And I select all PostGrid checkboxes and Confirm and Next until All Transactions are Reviewed
    Then I should see the message "All Transactions are Reviewed"

    Examples:
      | CaseNumber |
      | 00120865   |
