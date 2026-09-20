import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | TripDM',
  description: 'About TripDM - Your Trip. Your Choice. Your Direct Connection. Learn how TripDM connects travelers and verified travel agents directly.',
  alternates: {
    canonical: 'https://tripdm.com/policies/about',
  },
};

export default function AboutPage() {
  return (
    <div className="prose prose-sm md:prose-base max-w-none text-slate-700 font-sans">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase mb-1">
        ABOUT TRIPDM
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-8">
        Your Trip. Your Choice. Your Direct Connection.
      </p>

      <div className="space-y-8">
        <section>
          <p className="mb-4 font-medium text-gray-900">
            Travel planning shouldn&apos;t be complicated.
          </p>
          <p className="mb-4">
            TripDM is a travel discovery and communication platform built to connect travelers directly with travel agents. Instead of filling out multiple forms and waiting for calls, travelers can discover travel packages, choose an agent, and start a direct conversation through DM.
          </p>
          <p className="font-medium text-gray-900">
            We believe that the best travel plans begin with a conversation.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">1. What is TripDM?</h2>
          <p className="mb-4">
            TripDM brings travelers and travel agents together in one simple platform.
          </p>

          <p className="mb-2 font-semibold text-gray-900">Travelers can:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Discover travel packages and destinations.</li>
            <li>Explore different travel options.</li>
            <li>Connect directly with travel agents.</li>
            <li>Discuss their requirements and preferences.</li>
            <li>Ask questions and request customized itineraries.</li>
            <li>Communicate before making their travel decision.</li>
          </ul>

          <p className="mb-2 font-semibold text-gray-900">Travel agents can:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Showcase their travel packages.</li>
            <li>Reach travelers who are actively looking for trips.</li>
            <li>Receive direct customer inquiries.</li>
            <li>Understand customer requirements through conversation.</li>
            <li>Build relationships with potential customers.</li>
            <li>Grow their business through qualified travel leads.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Why &quot;TripDM&quot;?</h2>
          <p className="mb-2">The name represents exactly what we are building:</p>
          <p className="font-semibold text-gray-900 mb-3">Trip + Direct Message = TripDM</p>
          <p className="mb-2 font-semibold text-gray-900">Our idea is simple:</p>
          <p className="mb-4 italic text-gray-800">Find a trip. Send a DM. Start your journey.</p>
          <p>
            Rather than acting as the travel service provider, TripDM provides the digital space where travelers and independent travel agents can discover each other and communicate directly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Our Mission</h2>
          <p>
            To make travel planning more direct, transparent, and personal by connecting travelers with travel professionals through meaningful conversations.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Our Vision</h2>
          <p className="mb-3">
            We envision TripDM as a global travel marketplace where travelers don&apos;t simply search for packages—they connect with the people who can help create their journey.
          </p>
          <p>
            From a family holiday in Kashmir to a honeymoon in Bali, an adventure in Himachal Pradesh or an international vacation, TripDM aims to make the first step of every journey as simple as sending a message.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Built Around Direct Connection</h2>
          <p className="mb-3">
            Traditional travel discovery can involve multiple forms, phone calls, emails, and waiting for responses.
          </p>
          <p className="mb-2 font-semibold text-gray-900">TripDM takes a different approach:</p>
          <p className="font-semibold text-gray-900 mb-4">Discover &rarr; DM &rarr; Discuss &rarr; Decide &rarr; Travel</p>
          <p>
            The traveler remains in control of the conversation, while travel agents get an opportunity to understand the traveler&apos;s requirements directly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">6. For Travel Agents</h2>
          <p className="mb-3">
            TripDM is designed to help travel professionals reach customers without requiring them to compete only through traditional advertising.
          </p>
          <p className="mb-3">
            Agents can create their presence on TripDM, display their offerings, and receive direct inquiries from interested travelers.
          </p>
          <p>
            Our lead-based model allows agents to use TripDM Credits to connect with new customer inquiries.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">7. For Travelers</h2>
          <p className="mb-3">
            There is no need to send the same inquiry to multiple websites and wait for responses. With TripDM, travelers can discover relevant agents and start conversations directly.
          </p>
          <p className="mb-2 font-semibold text-gray-900">You decide:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Who to contact</li>
            <li>What to ask</li>
            <li>What package suits you</li>
            <li>Whether you want to proceed</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Trust &amp; Transparency</h2>
          <p className="mb-3">
            TripDM is committed to creating a responsible travel marketplace.
          </p>
          <p className="mb-2 font-semibold text-gray-900">We encourage:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Transparent communication</li>
            <li>Genuine travel packages</li>
            <li>Accurate information</li>
            <li>Responsible vendor behavior</li>
            <li>Genuine customer reviews</li>
            <li>Safe online interactions</li>
          </ul>
          <p>
            Travelers should independently verify package details, vendor credentials, pricing, payment information, cancellation policies, and other terms before entering into an agreement or making payment.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">9. TripDM&apos;s Role</h2>
          <p className="mb-3">
            TripDM is a technology platform and marketplace connecting travelers with independent travel agents and travel service providers.
          </p>
          <p className="mb-3">
            TripDM does not itself organize or operate the trips offered by independent vendors unless expressly stated.
          </p>
          <p>
            Any booking, payment, itinerary, refund, cancellation, or other travel arrangement is directly between the traveler and the respective travel service provider.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Start Your Journey With a DM</h2>
          <p className="mb-3">
            Whether you&apos;re looking for your next holiday or you&apos;re a travel professional looking for your next customer, TripDM brings both sides together.
          </p>
          <p className="mb-2 font-semibold text-gray-900">Discover. Connect. Discuss. Travel.</p>
          <p className="font-semibold text-gray-900">TripDM &mdash; Your Trip. Your DM. Your Journey.</p>
        </section>
      </div>
    </div>
  );
}
