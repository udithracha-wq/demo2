@Regression @NYselections @ClearSharedContributorCode @End_to_End
Feature: Clear Shared Repeat Contributor Code
  After opening the Repeat Contributor Report, a Repeat Contributor Code
  that appears on different Contributor Full Name groups must be cleared
  from the minority name group(s). The majority name keeps the code.
  On a 1×1 (or other) tie, keep the alphabetically first name and clear
  the other(s). Names are compared case-insensitively.
  Example: four rows for one name share a code, and a different name also
  has that code — clear the code on the different name via the edit icon
  and save. Scans every report page.
  The scenario reports every change as Contributor Full Name, Old Code,
  and New Code (console + reports/clear-shared-contributor-code-changes.json).

  Scenario Outline: Clear codes shared across different contributor names
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open the Repeat Contributor Report
    And I clear Repeat Contributor Codes shared across different names
    Then I should see the Repeat Contributor Code changes report
    And no Repeat Contributor Code should be shared across different names

    Examples:
      | CaseNumber |
      | 00121090   |
