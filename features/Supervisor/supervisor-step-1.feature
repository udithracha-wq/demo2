@NYselections @SupervisorStep1
Feature: Supervisor Step 1
  A supervisor opens a committee account, picks the Eligibility Review case
  from the Cases panel on the right of the account page, and assigns the
  Primary Auditor on it. The scenario passes only when the Primary Auditor
  field reads back the assigned name.

  Scenario Outline: Assign Primary Auditor on a new Eligibility Review case
    Given I am logged into NYselections Lightning
    When I search for and open account "<AccountName>"
    And I open the case with record type "<CaseRecordType>" from the Cases panel
    And I open the Details tab
    Then the case should have record type "<CaseRecordType>" and status "<Status>"
    And the Primary Auditor field should not already be "<PrimaryAuditor>"
    When I set Primary Auditor to "<PrimaryAuditor>"
    Then the Primary Auditor field should show "<PrimaryAuditor>"

    Examples:
      | AccountName                        | CaseRecordType     | Status | PrimaryAuditor |
      | Committee to Elect Patrick Sheehan | Eligibility Review | New    | Udith Racha    |
