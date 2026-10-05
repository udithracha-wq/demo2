@Regression @NYselections @PcfbAdminResendPaymentAnalyst @End_to_End
Feature: PCFB Admin Resend To Payment Analyst
  Open a case that is On Hold/ Admin Review owned by the PCFB Admin Queue,
  resend it to Payment Analyst via Report Generator, finish the flow, and
  confirm the case returns to Payment Analyst Review.

  Scenario Outline: PCFB Admin resends On Hold case to Payment Analyst
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open the Details tab
    Then the case status should be "On Hold/ Admin Review"
    And the case owner should be "PCFB Admin Queue"
    When I open the Report Generator tab
    And I click Resend To Payment Analyst
    And I click Finish on the Report Generator flow
    And I wait and refresh the case
    Then the case status should be "Payment Analyst Review"

    Examples:
      | CaseNumber |
      | 00120927   |
