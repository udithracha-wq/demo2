@Regression @NYselections @PaymentAnalyst1 @End_to_End
Feature: Payment Analyst 1
  A payment analyst opens a case in Payment Analyst Review, takes ownership,
  opens the Payment Transactions Report, and — when the Office is Member of
  Assembly or State Senator — confirms the expected payment report fields
  are present.

  Scenario Outline: Payment Transactions fields for Assembly / State Senator
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Payment Analyst Review"
    When I change the case owner to "<Owner>"
    And I capture the case Office
    And I open the Payment Transactions Report
    Then if the Office is Member of Assembly or State Senator, the payment analyst fields should be present
    And I close the Payment Transactions Report

    Examples:
      | CaseNumber | Owner       |
      | 00121042   | Udith Racha |
