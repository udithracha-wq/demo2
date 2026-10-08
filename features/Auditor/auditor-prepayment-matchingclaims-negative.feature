@Regression @NYselections @AuditorPrepaymentMatchingClaimsNegative @End_to_End
Feature: Auditor Prepayment Matching Claims Negative
  One prepayment matching-claims path on a single case.
  Empty findings (no codes to align, no shared codes, no duplicate flags)
  do not stop the path; the run moves on to the next section.
  If something is unexpected — a check fails, or the page is still not the
  expected page after one refresh — the run fails immediately.
  The terminal then prints a run summary: where it stopped, why, which
  checks passed, what was observed, and which steps did not run.
  1. Align Repeat Contributor Codes for duplicate names
  2. Clear Repeat Contributor Codes shared across different names
  3. Align Repeat Contributor Codes again
  4. Clear duplicate transaction flags
  5. Select all PostGrid rows until every transaction is reviewed
  6. Set Contribution Supporting Docs Received to Yes
  7. Set empty In District Confirmed values to No

  Scenario Outline: Complete the negative prepayment matching claims path
    Given I am logged into NYselections Lightning

    # 1. Repeat Contributor Code
    When I search for and open case "<CaseNumber>"
    And I open the Repeat Contributor Report
    And I align Repeat Contributor Codes for duplicate contributor names
    Then I should see the Repeat Contributor Code changes report
    And all duplicate contributor names should share the same Repeat Contributor Code

    # 2. Clear Shared Repeat Contributor Code
    When I search for and open case "<CaseNumber>"
    And I open the Repeat Contributor Report
    And I clear Repeat Contributor Codes shared across different names
    Then I should see the Repeat Contributor Code changes report
    And no Repeat Contributor Code should be shared across different names

    # 3. Repeat Contributor Code again
    When I search for and open case "<CaseNumber>"
    And I open the Repeat Contributor Report
    And I align Repeat Contributor Codes for duplicate contributor names
    Then I should see the Repeat Contributor Code changes report
    And all duplicate contributor names should share the same Repeat Contributor Code

    # 4. Duplicate Transaction
    When I search for and open case "<CaseNumber>"
    And I open the duplicate transaction report
    And I clear duplicate flags on all flagged transactions
    And I click Next on the duplicate transaction report
    And I close the duplicate transaction dialog
    Then I should see case "<CaseNumber>" after duplicate transaction
    And I should report all affected transaction numbers
    And no flagged transactions should remain on the report

    # 5. PostGrid Selecting All
    When I search for and open case "<CaseNumber>"
    And I open PostGrid In-District Audit Report
    And I select all PostGrid checkboxes and Confirm and Next until all transactions are completed
    Then I should see that all PostGrid transactions are completed

    # 6. Supporting Docs Yes
    When I search for and open case "<CaseNumber>"
    And I open Audit Matching Claim Data
    And I set Contribution Supporting Docs Received to Yes on all pages
    And I save Audit Matching Claim Data
    Then Audit Matching Claim Data should be saved successfully
    And I should report all Contribution Supporting Docs Received transaction numbers marked Yes

    # 7. Is District
    When I search for and open case "<CaseNumber>"
    And I open Audit Matching Claim Data
    And I set empty In District Confirmed values to No on all pages
    And I save Audit Matching Claim Data
    Then Audit Matching Claim Data should be saved successfully
    And I should report all In District Confirmed transaction numbers marked No

    Examples:
      | CaseNumber |
      | 00120859   |
