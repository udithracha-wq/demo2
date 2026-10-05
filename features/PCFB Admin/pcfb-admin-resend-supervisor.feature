@Regression @NYselections @PcfbAdminResendSupervisor @End_to_End
Feature: PCFB Admin Resend To Supervisor Review
  Open a case that is On Hold/ Admin Review owned by the PCFB Admin Queue,
  send it to Supervisor Review via Report Generator, finish the flow, and
  confirm the case returns to Supervisor Review.

  Scenario Outline: PCFB Admin sends On Hold case to Supervisor Review
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    And I open the Details tab
    Then the case status should be "On Hold/ Admin Review"
    And the case owner should be "PCFB Admin Queue"
    When I open the Report Generator tab
    And I click Send to Supervisor Review
    And I click Finish on the Report Generator flow
    And I wait and refresh the case
    Then the case status should be "Supervisor Review"

    Examples:
      | CaseNumber |
      | 00120927   |
