@Regression @NYselections @RepeatContributorCode @End_to_End
Feature: Repeat Contributor Code
  After opening the Repeat Contributor Report, rows that share the same
  Contributor Full Name must also share the same Repeat Contributor Code.
  When a name has mixed codes, copy a matching code onto the wrong rows
  via the edit icon and save.
  The scenario reports every change as Contributor Full Name, Old Code,
  and New Code (console + reports/repeat-contributor-code-changes.json).

  Scenario Outline: Align repeat contributor codes for duplicate names
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open the Repeat Contributor Report
    And I align Repeat Contributor Codes for duplicate contributor names
    Then I should see the Repeat Contributor Code changes report
    And all duplicate contributor names should share the same Repeat Contributor Code

    Examples:
      | CaseNumber |
      | 00121034   |
