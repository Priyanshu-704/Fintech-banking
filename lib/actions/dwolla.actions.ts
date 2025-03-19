"use server";

import { Client } from "dwolla-v2";

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

// Initialize Dwolla Client with API Keys
const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});

// Helper function to log API errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logError = (action: string, err: any) => {
  console.error(`${action} Failed:`, err.response ? err.response.body : err);
};

// Create a Dwolla Customer
export const createDwollaCustomer = async (
  newCustomer: NewDwollaCustomerParams
) => {
  try {
    console.log("Creating Dwolla Customer with data:", JSON.stringify(newCustomer, null, 2));

    const response = await dwollaClient.post("customers", newCustomer);
    const customerUrl = response.headers.get("location");

    console.log("Dwolla Customer Created:", customerUrl);
    return customerUrl;
  } catch (err) {
    logError("Creating a Dwolla Customer", err);
    return null;
  }
};

// Create a Dwolla Funding Source using a Plaid Processor Token
export const createFundingSource = async (
  options: CreateFundingSourceOptions
) => {
  try {
    console.log("Creating Funding Source for customer:", options.customerId);

    const response = await dwollaClient.post(
      `customers/${options.customerId}/funding-sources`,
      {
        name: options.fundingSourceName,
        plaidToken: options.plaidToken,
      }
    );

    const fundingSourceUrl = response.headers.get("location");
    console.log("Funding Source Created:", fundingSourceUrl);
    return fundingSourceUrl;
  } catch (err) {
    logError("Creating a Funding Source", err);
    return null;
  }
};

// Create an On-Demand Authorization
export const createOnDemandAuthorization = async () => {
  try {
    console.log("Creating On-Demand Authorization...");

    const response = await dwollaClient.post("on-demand-authorizations");
    const authLink = response.body._links;

    console.log("On-Demand Authorization Created:", authLink);
    return authLink;
  } catch (err) {
    logError("Creating an On-Demand Authorization", err);
    return null;
  }
};

// Create a Transfer between funding sources
export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
    console.log(`Transferring $${amount} from ${sourceFundingSourceUrl} to ${destinationFundingSourceUrl}`);

    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };

    const response = await dwollaClient.post("transfers", requestBody);
    const transferUrl = response.headers.get("location");

    console.log("Transfer Created:", transferUrl);
    return transferUrl;
  } catch (err) {
    logError("Transfer Fund", err);
    return null;
  }
};

// Add a funding source for a Dwolla customer
export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    console.log(`Adding Funding Source to customer: ${dwollaCustomerId}`);

    const dwollaAuthLinks = await createOnDemandAuthorization();

    const fundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };

    return await createFundingSource(fundingSourceOptions);
  } catch (err) {
    logError("Adding Funding Source", err);
    return null;
  }
};
