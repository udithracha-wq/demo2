@Regression @NYselections @SupportingDocsYes @End_to_End
Feature: Supporting Docs Yes
  Search a case, open Audit Matching Claim Data, set
  Contribution Supporting Docs Received? to Yes on every row
  across all report pages, Save, and report every Transaction
  Number that was marked Yes.

  Scenario Outline: Set Contribution Supporting Docs Received to Yes on all pages
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Audit Matching Claim Data
    And I set Contribution Supporting Docs Received to Yes on all pages
    And I save Audit Matching Claim Data
    Then Audit Matching Claim Data should be saved successfully
    And I should report all Contribution Supporting Docs Received transaction numbers marked Yes

    Examples:
      | CaseNumber |
      | 00121090   |
