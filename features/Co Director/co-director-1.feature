@Regression @NYselections @CoDirector1 @End_to_End
Feature: Co Director 1
  From a case in Voucher Review, open the committee Cases list, open the
  Payment data as of link for that voucher-review case, verify Co-Director
  Approval fields are empty on a row for that same committee, then Accept
  via Co Director 1 Approval.

  Scenario Outline: Co Director 1 accepts voucher review payment cycle
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Voucher Review"
    When I open the committee for the case
    And I open the Cases tab and view all cases
    And I open the Payment data as of link for status "Voucher Review"
    And I open the Co-Director Approval tab
    Then the Co-Director Approval Status and Commissioner Approval Date should be empty
    When I select the Co Director 1 Approval record
    And I accept Co Director 1 Approval
    Then I should see a Co Director 1 Approval success message

    Examples:
      | CaseNumber |
      | 00121042   |
