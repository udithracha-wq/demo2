@Regression @NYselections @DuplicateTransaction @End_to_End
Feature: Duplicate Transaction
  Search a case, open the duplicate transaction report, walk every report
  page until none remain, click Finish so removals persist, refresh, and
  fail if any Flagged row is still present.

  Scenario Outline: Remove duplicate flags from all flagged transactions
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open the duplicate transaction report
    And I clear duplicate flags on all flagged transactions
    And I click Next on the duplicate transaction report
    And I close the duplicate transaction dialog
    Then I should see case "<CaseNumber>" after duplicate transaction
    And I should report all affected transaction numbers
    And no flagged transactions should remain on the report

    Examples:
      | CaseNumber |
      | 00120858   |
