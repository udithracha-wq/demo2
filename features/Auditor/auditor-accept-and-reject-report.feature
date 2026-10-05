@Regression @NYselections @AuditorAcceptAndRejectReport @End_to_End
Feature: Auditor Accept and Reject Report
  An auditor opens a case in Matching Claim Review, takes ownership, opens
  Accepted and Rejected Claims Data, turns Payment Disagreed Transactions
  Active, sets In District Confirmed? to No on every Payment Analyst Status
  Disagree row, then Saves.

  Scenario Outline: Set In District Confirmed to No on Payment Disagreed rows
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Matching Claim Review"
    When I change the case owner to "<Owner>"
    And I open the Accepted and Rejected Claims Data report
    And I select Payment Disagreed Transactions on the Accept Reject report
    And I set In District Confirmed to "No" for all Payment Analyst Status Disagree rows
    And I save the Accepted and Rejected Claims Data report
    Then the Accepted and Rejected Claims Data report should be saved successfully

    Examples:
      | CaseNumber | Owner       |
      | 00120952   | Udith Racha |
