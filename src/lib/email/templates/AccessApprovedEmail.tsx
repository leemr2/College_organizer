import React from 'react';

interface AccessApprovedEmailProps {
  email: string;
}

export function AccessApprovedEmail({ email }: AccessApprovedEmailProps) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>Your Access Has Been Approved! 🎉</h1>
      
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151' }}>
        Great news! Your access request for <strong>{email}</strong> has been approved.
      </p>
      
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginTop: '20px' }}>
        You can now sign in to Scout and start using the app. Just visit the sign-in page and use your email address.
      </p>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
          <strong>Next steps:</strong>
        </p>
        <ol style={{ marginTop: '10px', paddingLeft: '20px', color: '#374151' }}>
          <li>Go to the sign-in page</li>
          <li>Enter your email address</li>
          <li>You'll receive a magic link to sign in</li>
          <li>Complete your onboarding to get started!</li>
        </ol>
      </div>
      
      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '30px' }}>
        If you have any questions, feel free to reach out to our support team.
      </p>
      
      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
        Welcome to Scout! 🚀
      </p>
    </div>
  );
}

