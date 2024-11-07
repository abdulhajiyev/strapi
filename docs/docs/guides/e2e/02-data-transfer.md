---
title: Data Transfer
tags:
  - testing
  - e2e
  - data-transfer
  - infrastructure
---

## Overview

This document explains how and why we use `@strapi/data-transfer` as means to reset and seed the database for end-to-end tests. It is not a comprehensive explanation of how to use `@strapi/data-transfer`. See the [Strapi documentation](https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html) to learn more about the feature.

### Why use Data Transfer?

Each test should be isolated and not depend on another test. Data changes from one test should not leak into another test. For example, if you create a new entry for a content-type in one test case, it should not be present in the next test case. This makes tests more stable and easier to debug.

We could use custom API endpoints of the application, and whilst this isn't a poor solution, it would _most likely_ require some code writing to set up the data for the schema entries. However, in `4.6.0` Strapi released the `DTS` feature (DTS – Data Transfer System). This means any member of Strapi can export the data of their instance producing a `.tar` that we can then import programatically restoring the database to this point in time and ensuring a "pure" test environment.

### Limitations of Data Transfer

The main limitation with data transfer is we cannot version or review changes to the data. Making changes to the data set should be done with care since it is quite easy to export data with unknown changes to the database that could impact other tests. 

## Updating data for tests

### The data transfer engine

Since the Strapi CLI will use `@strapi/data-transfer` directly it will by default not import or export admin users, API tokens, or any other features that have been included in its exclusion list. 

For this reason, do NOT use the import or export command on the strapi test instance. A DTS engine has been created specifically for our tests cases. This allows us to redefine what should be included in the import or export for our tests. The scripts can be found in `tests/e2e/scripts/dts-import.ts` and `tests/e2e/scripts/dts-export.ts`.

### Importing an existing data packet

When you need to update the data packet for a new test, you will first need a Strapi app with the data currently used in end-to-end tests.

The test instances used in for end to end tests are created from a Strapi template. The safest way to update the data packet is to create a *fresh* Strapi instance using the test-app template found in `tests/e2e/app-template`. 

Within the monorepo run:

```shell
npx create-strapi-app@latest --quickstart my-test-app --template <path-to-template>
```

:::note
You need to create an empty `yarn.lock` file in your test app before running `yarn install`
:::

Within the app you created, run `yarn develop` and you should be able to login with:

| Email            | Password    |
|------------------|-------------|
| test@testing.com | Testing123! |

Leave the development server running, and then run the following command to import the current data packet used for end-to end-tests. The script expects the name of the data packet you want to import found in `tests/e2e/data`. 

```shell
STRAPI_LICENSE=<license-with-ee-feature> npx ts-node <PATH_TO_SCRIPT>/dts-import.ts with-admin.tar
```
This script will include admin users and all the content-types specificed in `tests/e2e/constants.ts`

If you need to modify data to prepare for a new data export, you can start creating or deleting content in the CMS.

:::note
If you change any of the content schemas (including adding new ones) be sure to [update the `app-template`](./01-app-template.md) otherwise DTS will fail to import the data for schemas that do not exist.
:::

### Exporting an updated data packet

Once you've created your new data from the test instance, you'll need to export it so it can be used in the end-to-end tests.

Be sure to include the content types you would like exported in the `ALLOWED_CONTENT_TYPES` array found in `tests/e2e/constants.js`.

The script accepts the backup destination filename as an argument. Run it from the directory of the strapi instance you created earlier based on the test-app template.

```shell
npx ts-node <PATH_TO_SCRIPT>/dts-export.ts updated-data-packet
```

If you are exporting data for an EE feature you will need to run the script with the `STRAPI_LICENSE` env

```shell
STRAPI_LICENSE=<license-with-ee-feature> npx ts-node <PATH_TO_SCRIPT>/dts-export.ts updated-data-packet
```

The script will create a file `updated-data-packet.tar`. You can copy this file over to `tests/e2e/data` so it can be used in the appropriate tests.


### Importing the data packet in test scenarios

There's an abstraction for importing the data programmatically during tests named `resetDatabaseAndImportDataFromPath` found in `tests/e2e/utils/dts-import.ts`. Typically, you'll want to run this **before** each test:

```ts
import { test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from './utils/dts-import';

test.describe('Strapi Application', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('backup.tar');
    await page.goto('/admin');
  });

  test('a user should be able to...', async ({ page }) => {
    // my test
  });
});
```