"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, MailOpen, Send, Reply, Trash2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import API_URL from "@/lib/apiBase"


interface Message {
  _id: string
  subject: string
  body: string
  is_read: boolean
  created_at: string
  from_user_id?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    employee_id?: string
  }
  to_user_id?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    employee_id?: string
  }
}

interface Employee {
  _id: string
  firstName: string
  lastName: string
  email: string
  employee_id?: string
  department?: string
  position?: string
}

export default function EmployeeMessagesPage() {
  const [inboxMessages, setInboxMessages] = useState<Message[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [open, setOpen] = useState(false)
  
  // Compose form state
  const [recipientId, setRecipientId] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  useEffect(() => {
    fetchMessages()
    fetchEmployees()
  }, [])

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token")
      
      const [inboxRes, sentRes] = await Promise.all([
        fetch(`${API_URL}/api/messages/inbox`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/messages/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const inboxData = await inboxRes.json()
      const sentData = await sentRes.json()

      if (inboxData.success) setInboxMessages(inboxData.data)
      if (sentData.success) setSentMessages(sentData.data)
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token")
      
      const response = await fetch(`${API_URL}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setEmployees(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("token")
      
      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_user_id: recipientId,
          subject,
          body,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setComposeOpen(false)
        setRecipientId("")
        setSelectedEmployee(null)
        setSubject("")
        setBody("")
        fetchMessages()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem("token")
      
      await fetch(`${API_URL}/api/messages/${messageId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      fetchMessages()
    } catch (error) {
      console.error("Failed to mark message as read:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem("token")
      
      await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      fetchMessages()
      setSelectedMessage(null)
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const unreadCount = inboxMessages.filter(m => !m.is_read).length

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Communicate with your team and managers
                </p>
              </div>
              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Compose
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                    <DialogDescription>Send a message to a team member</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <Label htmlFor="recipient">Recipient</Label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                          >
                            {selectedEmployee
                              ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} ${selectedEmployee.employee_id ? `(${selectedEmployee.employee_id})` : ''}`
                              : "Select employee..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search employee..." />
                            <CommandEmpty>No employee found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {employees.map((employee) => (
                                <CommandItem
                                  key={employee._id}
                                  value={`${employee.firstName} ${employee.lastName} ${employee.employee_id || ''}`}
                                  onSelect={() => {
                                    setSelectedEmployee(employee)
                                    setRecipientId(employee._id)
                                    setOpen(false)
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {employee.firstName} {employee.lastName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {employee.employee_id && `${employee.employee_id} • `}
                                      {employee.position || 'No position'} • {employee.department || 'No department'}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Enter subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="body">Message</Label>
                      <Textarea
                        id="body"
                        placeholder="Type your message here"
                        rows={6}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Inbox
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{inboxMessages.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Unread
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-500">{unreadCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-500">{sentMessages.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Messages Tabs */}
            <Tabs defaultValue="inbox">
              <TabsList>
                <TabsTrigger value="inbox">
                  Inbox
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-orange-500">{unreadCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : inboxMessages.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No messages in inbox</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {inboxMessages.map((message) => (
                      <Card
                        key={message._id}
                        className={`cursor-pointer transition-colors ${
                          !message.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                        }`}
                        onClick={() => {
                          setSelectedMessage(message)
                          if (!message.is_read) handleMarkAsRead(message._id)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {message.is_read ? (
                                <MailOpen className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Mail className="h-5 w-5 text-blue-500" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium ${!message.is_read ? "font-bold" : ""}`}>
                                    {message.from_user_id?.firstName} {message.from_user_id?.lastName}
                                  </p>
                                  {message.from_user_id?.employee_id && (
                                    <Badge variant="outline" className="text-xs">
                                      {message.from_user_id.employee_id}
                                    </Badge>
                                  )}
                                </div>
                                <p className={`text-sm ${!message.is_read ? "font-semibold" : ""}`}>
                                  {message.subject}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-1">{message.body}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent" className="mt-6">
                {sentMessages.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Send className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No sent messages</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {sentMessages.map((message) => (
                      <Card key={message._id} className="cursor-pointer" onClick={() => setSelectedMessage(message)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Send className="h-5 w-5 text-green-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    To: {message.to_user_id?.firstName} {message.to_user_id?.lastName}
                                  </p>
                                  {message.to_user_id?.employee_id && (
                                    <Badge variant="outline" className="text-xs">
                                      {message.to_user_id.employee_id}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium">{message.subject}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{message.body}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Message Detail Dialog */}
            {selectedMessage && (
              <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{selectedMessage.subject}</DialogTitle>
                    <DialogDescription>
                      From: {selectedMessage.from_user_id?.firstName} {selectedMessage.from_user_id?.lastName}
                      {selectedMessage.from_user_id?.employee_id && ` (${selectedMessage.from_user_id.employee_id})`}
                      <br />
                      Date: {new Date(selectedMessage.created_at).toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleDeleteMessage(selectedMessage._id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button onClick={() => {
                      setRecipientId(selectedMessage.from_user_id?._id || "")
                      setSubject(`Re: ${selectedMessage.subject}`)
                      setComposeOpen(true)
                      setSelectedMessage(null)
                    }}>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
    </main>
  )
}
