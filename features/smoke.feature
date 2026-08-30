@Sanity @Smoke
Feature: Framework smoke check
  Verify the BDD Playwright framework can launch a browser and open a page.

  Scenario: Open example.com home page
    Given I open the application home page
    Then the page title should contain "Example Domain"
    And I should see a heading "Example Domain"
    And the current URL should contain "example.com"
