@Regression @NYselections @AuditorAgreeAuditFieldsChange @End_to_End
Feature: Auditor Agree Audit Fields Change
  On Random Sampling Records, for every row where Verifier Status is Disagree,
  set Auditor Response to Agree and flip In District Confirmed?
  (Yes to No, or No to Yes), then Save.

  Scenario Outline: Agree Auditor Response and flip In District Confirmed for Disagree rows
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open Random Sampling Records
    And I verify Disagree Verifier Status fields are present
    And I set Auditor Response to Agree for all Disagree Verifier Status rows
    And I flip In District Confirmed for all Disagree Verifier Status rows
    And I save Random Sampling Records
    Then Random Sampling Records should be saved successfully
    And I should report all flipped In District Confirmed transaction numbers

    Examples:
      | CaseNumber |
      | 00121015   |
