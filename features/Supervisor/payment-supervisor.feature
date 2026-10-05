@Regression @NYselections @PaymentSupervisor @End_to_End
Feature: Payment Supervisor
  Same flow as Payment Analyst 1: take ownership and open the Payment
  Transactions Report. If Payment Amount is $0, the empty-state message is
  expected; otherwise Assembly/Senator payment fields must be present. Then
  open the committee Depository/Bank section and confirm SFS Vendor Id.
  The case under test must already be in Supervisor Review.

  Scenario Outline: Payment Transactions fields for Assembly / State Senator (Supervisor Review)
    Given I am logged into NYselections Lightning
    When I search for and open case "<CaseNumber>"
    Then the case status should be "Supervisor Review"
    When I change the case owner to "<Owner>"
    And I capture the case Office
    And I open the Payment Transactions Report if possible
    Then if Payment Amount is 0 expect the empty transactions message otherwise expect payment fields
    # Soft: if the report check times out, close and continue to committee / bank
    And I close the Payment Transactions Report if it is open
    When I open the committee for the case
    And I open the Depository Bank tab
    Then the SFS Vendor Id should be present

    Examples:
      | CaseNumber | Owner       |
      | 00121081   | Udith Racha |
