@Regression @NYselections @Auditor1 @End_to_End
Feature: NYselections Auditor1
  Log into Lightning, open a case, select party, and complete the Eligibility Dashboard questionnaire.

  Scenario Outline: Complete eligibility questionnaire for a party
    Given I am logged into NYselections Lightning
    When I open case "<CaseNumber>"
    And I select "<Party>" for party selection if present
    And I click Next if present
    And I open the Details tab
    And I set Primary Auditor to "<PrimaryAuditor>"
    And I open the Eligibility Dashboard tab
    And I select "<Party>" for party selection if present
    And I complete the eligibility questionnaire answering Yes
    Then I should see case "<CaseNumber>"

    Examples:
      | CaseNumber           | Party      | PrimaryAuditor |
      |  00120464            | Republican | Udith Racha    |
