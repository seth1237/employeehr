'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ServicesList from './ServicesList'
import ServiceJobsList from './ServiceJobsList'
import ServicesDashboard from './ServicesDashboard'

export default function ServicesModule() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Services Management</h1>
        <p className="text-gray-600">Manage services, schedule jobs, and track service delivery</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ServicesDashboard />
        </TabsContent>

        <TabsContent value="services">
          <ServicesList />
        </TabsContent>

        <TabsContent value="jobs">
          <ServiceJobsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
