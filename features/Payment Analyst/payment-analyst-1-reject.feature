@Regression @NYselections @PaymentAnalyst1Reject @End_to_End
Feature: Payment Analyst 1 Reject
  A payment analyst opens a case in Payment Analyst Review, takes ownership,
  rejects it from Approval History with comments, and confirms the case status
  moves to On Hold/ Admin Review.

  Scenario Outline: Payment analyst rejects case and status moves to On Hold
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Payment Analyst Review"
    When I change the case owner to "<Owner>"
    And I choose "Reject" from Approval History with comments "<Comments>"
    Then the approval action should be submitted
    And the case status should be "On Hold/ Admin Review"

    Examples:
      | CaseNumber | Owner       | Comments |
      | 00120927   | Udith Racha | test     |
