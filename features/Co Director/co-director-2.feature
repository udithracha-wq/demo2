@Regression @NYselections @CoDirector2 @End_to_End
Feature: Co Director 2
  From a case in Voucher Review, open the committee Cases list, open the
  Payment data as of link for that voucher-review case, verify Co Director 1
  Approved (Commissioner Approval Date filled), then Accept via Co Director 2.

  Scenario Outline: Co Director 2 accepts voucher review payment cycle
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Voucher Review"
    When I open the committee for the case
    And I open the Cases tab and view all cases
    And I open the Payment data as of link for status "Voucher Review"
    And I open the Co-Director Approval tab
    Then the Co-Director Approval Status and Commissioner Approval Date should be filled
    When I select the Co Director 2 Approval record
    And I accept Co Director 2 Approval
    Then I should see a Co Director 2 Approval success message

    Examples:
      | CaseNumber |
      | 00121042   |
