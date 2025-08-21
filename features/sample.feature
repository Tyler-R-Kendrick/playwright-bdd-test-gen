Feature: Sample login
  As a user I want to login so I can access my dashboard

  Scenario: Successful login
    Given I go to "/login"
    When I fill in "username" with "testuser"
    And I fill in "password" with "secret"
    And I click "Log in"
    Then I should see "Welcome"
