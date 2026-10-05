@Regression @NYselections @PaymentAnalyst1VarianceReject @End_to_End
Feature: Payment Analyst 1 Variance Reject
  A payment analyst opens a case in Payment Analyst Review, takes ownership,
  and — when Variance Report is available — turns Unreviewed Transactions
  Active, sets Payment Analyst Status to Disagree and notes on every row,
  then rejects the case so status moves to On Hold/ Admin Review.

  Scenario Outline: Payment analyst rejects after Variance Report updates
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Payment Analyst Review"
    When I change the case owner to "<Owner>"
    And I open the Variance Report if it is available
    And I select Unreviewed transactions on the Variance Report
    And I set Payment Analyst Status to "Disagree" and Notes "<Notes>" for all Variance rows
    And I save and close the Variance Report
    And I choose "Reject" from Approval History with comments "<Comments>"
    Then the approval action should be submitted
    And the case status should be "On Hold/ Admin Review"

    Examples:
      | CaseNumber | Owner       | Notes | Comments |
      | 00121050   | Udith Racha | test  | test     |
