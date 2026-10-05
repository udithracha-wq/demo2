@Regression @NYselections @PaymentSupervisorVendorId @End_to_End
Feature: Payment Supervisor Vendor Id Approve
  Open Payment Transactions Report and check Assembly/Senator fields:
  missing/different fields fail the test; if no fields are shown, log the
  on-screen message and continue. Then Approve from Approval History:
  - If SFS Vendor Id is populated → Approve succeeds (no Vendor ID error)
    and after refresh the case is in Voucher Review
  - If SFS Vendor Id is not populated → Approve shows the Vendor ID
    required error and after refresh the case stays in Supervisor Review

  Scenario Outline: Supervisor Approve outcome depends on SFS Vendor Id
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Supervisor Review"
    When I change the case owner to "<Owner>"
    And I capture the case Office
    And I open the Payment Transactions Report
    Then I check Payment Transactions Report fields or report the message and continue
    And I close the Payment Transactions Report if it is open
    When I open the committee for the case
    And I open the Depository Bank tab
    And I capture whether the SFS Vendor Id is populated
    When I return to case "<CaseNumber>"
    And I choose "Approve" from Approval History with comments "<Comments>"
    Then the Approve outcome should match the SFS Vendor Id presence for case "<CaseNumber>"

    Examples:
      | CaseNumber | Owner       | Comments |
      | 00121036   | Udith Racha | test     |
