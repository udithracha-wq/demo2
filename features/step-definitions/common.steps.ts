import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';
import { HomePage } from '../../pages/HomePage';

Given('I open the application home page', async function (this: CustomWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.open('/');
});

When('I navigate to {string}', async function (this: CustomWorld, path: string) {
  const homePage = new HomePage(this.page!);
  await homePage.open(path);
});

Then('the page title should contain {string}', async function (
  this: CustomWorld,
  text: string
) {
  const homePage = new HomePage(this.page!);
  await homePage.expectTitleContains(text);
});

Then('I should see a heading {string}', async function (
  this: CustomWorld,
  heading: string
) {
  const homePage = new HomePage(this.page!);
  await homePage.expectHeadingVisible(heading);
});

Then('the current URL should contain {string}', async function (
  this: CustomWorld,
  fragment: string
) {
  expect(this.page!.url()).toContain(fragment);
});
