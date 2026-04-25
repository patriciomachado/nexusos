import NewOSForm from '@/components/forms/NewOSForm'

export default function TestPage() {
    return (
        <div className="p-8">
            <h1 className="text-xl mb-4">Test Page for NewOSForm</h1>
            <NewOSForm 
                customers={[{ id: '1', name: 'John Doe' }]}
                technicians={[{ id: '1', name: 'Tech 1' }]}
                inventoryItems={[]}
                companyId="something"
            />
        </div>
    )
}
