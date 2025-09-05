import { AwsRum } from 'aws-rum-web';

// Initialize CloudWatch RUM
let awsRum: AwsRum | null = null;

try {
  const config = {
    sessionSampleRate: 1,
    identityPoolId: "eu-central-1:2d511317-7574-49aa-8195-7d72ff4b2218",
    endpoint: "https://dataplane.rum.eu-central-1.amazonaws.com",
    telemetries: ["performance", "errors", "http"],
    allowCookies: true,
    enableXRay: false,
    signing: true // If you have a public resource policy and wish to send unsigned requests please set this to false
  };

  // Use environment variables for better configuration management
  const APPLICATION_ID = process.env.REACT_APP_AWS_RUM_APPLICATION_ID || '0155b973-0645-4f19-8825-cef9e75c7619';
  const APPLICATION_VERSION = process.env.REACT_APP_AWS_RUM_APPLICATION_VERSION || '1.0.0';
  const APPLICATION_REGION = process.env.REACT_APP_AWS_RUM_APPLICATION_REGION || 'eu-central-1';

  // Only initialize RUM if we have the required environment variables
  if (APPLICATION_ID && APPLICATION_VERSION && APPLICATION_REGION) {
    awsRum = new AwsRum(
      APPLICATION_ID,
      APPLICATION_VERSION,
      APPLICATION_REGION,
      config
    );
  } else {
    console.warn('CloudWatch RUM environment variables not properly configured');
  }
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
  console.warn('CloudWatch RUM initialization failed:', error);
}

// Export at the top level
export default awsRum;
