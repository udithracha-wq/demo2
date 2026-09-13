@Regression @NYselections @IsDistrict @End_to_End
Feature: Is District
  Search a case, open Audit Matching Claim Data, set empty
  In District Confirmed values to No on every report page, Save,
  and report every Transaction Number that was marked No.

  Scenario Outline: Set empty In District Confirmed to No on all pages
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Audit Matching Claim Data
    And I set empty In District Confirmed values to No on all pages
    And I save Audit Matching Claim Data
    Then Audit Matching Claim Data should be saved successfully
    And I should report all In District Confirmed transaction numbers marked No

    Examples:
      | CaseNumber |
      | 00120857   |
