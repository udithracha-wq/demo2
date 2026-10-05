@Regression @NYselections @PcfbAdminGenerateVoucher @End_to_End
Feature: PCFB Admin Generate Voucher
  From a case in Voucher Review, open the committee Cases list, open the
  Payment data as of link for that voucher-review case, then Generate
  Voucher Report and verify the success message.

  Scenario Outline: PCFB Admin generates voucher report
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Voucher Review"
    When I open the committee for the case
    And I open the Cases tab and view all cases
    And I open the Payment data as of link for status "Voucher Review"
    And I click Generate Voucher Report
    Then I should see a Generate Voucher Report success message

    Examples:
      | CaseNumber |
      | 00121073   |
